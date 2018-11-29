class Default_Cmp(object):
    def __init__(self, tup):
        self.tup = tup

    def __lt__(self, other):
        (self_tup, other_tup) = (self.tup, other.tup)
        if self_tup.level != other_tup.level:
            return self_tup.level < other_tup.level
        elif self_tup.tips != other_tup.tips:
            return self_tup.tips < other_tup.tips
        else:
            return self_tup.breaker <  other_tup.breaker

class Balace_Cmp(object):
    def __init__(self, tup):
        self.tup = tup

    def __lt__(self, other):
        (self_tup, other_tup) = (self.tup, other.tup)

        if self_tup.balance != other_tup.balance:
            return self_tup.balance > other_tup.balance
        elif self_tup.level != other_tup.level:
            return self_tup.level < other_tup.level
        elif self_tup.tips != other_tup.tips:
            return self_tup.tips < other_tup.tips
        else:
            return self_tup.breaker <  other_tup.breaker